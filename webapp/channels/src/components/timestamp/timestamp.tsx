// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import caps from 'lodash/capitalize';
import isArray from 'lodash/isArray';
import upperFirst from 'lodash/upperFirst';
import type {Moment} from 'moment-timezone';
import moment from 'moment-timezone';
import React, {PureComponent} from 'react';
import type {ReactNode} from 'react';
import {unstable_batchedUpdates} from 'react-dom';
import {
    injectIntl,
    FormattedMessage,
} from 'react-intl';
import type {
    IntlShape,
    FormatDateOptions,
    FormatRelativeTimeOptions} from 'react-intl';
import {isValidElementType} from 'react-is';

import type {RequireOnlyOne} from '@mattermost/types/utilities';

import {isSameYear, isWithin, isEqual, getDiff} from 'utils/datetime';
import {resolve} from 'utils/resolvable';
import type {Resolvable} from 'utils/resolvable';

import {STANDARD_UNITS} from './relative_ranges';
import SemanticTime from './semantic_time';

// Feature test the browser for support of hourCycle.
// Note that Intl.DateTimeFormatOptions typings are stale and do not have definitions of hourCycle, dateStyle, etc..
// See https://github.com/microsoft/TypeScript/issues/34399
export const supportsHourCycle = Boolean(((new Intl.DateTimeFormat('en-US', {hour: 'numeric'})).resolvedOptions() as DateTimeOptions).hourCycle);

export type DateTimeOptions = FormatDateOptions & {
    hourCycle?: string;
}

function is12HourTime(hourCycle: DateTimeOptions['hourCycle'], hour12?: DateTimeOptions['hour12']) {
    return hour12 ?? !(hourCycle === 'h23' || hourCycle === 'h24');
}

export type RelativeOptions = FormatRelativeTimeOptions & {
    unit: Intl.RelativeTimeFormatUnit;
    relNearest?: number;
    truncateEndpoints?: boolean;
    updateIntervalInSeconds?: number;
    capitalize?: boolean;
}

function isRelative(format: ResolvedFormats['relative']): format is RelativeOptions {
    return Boolean((format as RelativeOptions)?.unit);
}

export type SimpleRelativeOptions = {
    message: ReactNode;
    updateIntervalInSeconds?: number;
}

function isSimpleRelative(format: unknown): format is SimpleRelativeOptions {
    return (format as SimpleRelativeOptions)?.message != null;
}

const defaultRefreshIntervals = new Map<Intl.RelativeTimeFormatUnit, number /* seconds */>([
    ['hour', 60 * 5],
    ['minute', 15],
    ['second', 1],
]);

const MAX_CACHED_DATE_TIME_FORMATS = 200;

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getCachedDateTimeFormat(locale: string, timeZone: DateTimeOptions['timeZone'], options: DateTimeOptions): Intl.DateTimeFormat {
    const merged = {timeZone, ...options};
    const keyTimeZone = merged.timeZone ?? `host-offset-${new Date().getTimezoneOffset()}`;
    const key = `${locale}|${keyTimeZone}|${JSON.stringify(merged)}`;
    let formatter = dateTimeFormatCache.get(key);
    if (!formatter) {
        if (dateTimeFormatCache.size >= MAX_CACHED_DATE_TIME_FORMATS) {
            dateTimeFormatCache.clear();
        }
        formatter = new Intl.DateTimeFormat(locale, merged);
        dateTimeFormatCache.set(key, formatter);
    }
    return formatter;
}

const tickSubscribers = new Map<number, Set<() => void>>();
const tickTimers = new Map<number, ReturnType<typeof setInterval>>();

function subscribeToTick(intervalSeconds: number, callback: () => void) {
    let subscribers = tickSubscribers.get(intervalSeconds);
    if (!subscribers) {
        subscribers = new Set();
        tickSubscribers.set(intervalSeconds, subscribers);
        tickTimers.set(intervalSeconds, setInterval(() => {
            unstable_batchedUpdates(() => {
                tickSubscribers.get(intervalSeconds)?.forEach((subscriber) => subscriber());
            });
        }, intervalSeconds * 1000));
    }
    subscribers.add(callback);
}

function unsubscribeFromTick(intervalSeconds: number, callback: () => void) {
    const subscribers = tickSubscribers.get(intervalSeconds);
    if (!subscribers) {
        return;
    }
    subscribers.delete(callback);
    if (subscribers.size === 0) {
        clearInterval(tickTimers.get(intervalSeconds));
        tickTimers.delete(intervalSeconds);
        tickSubscribers.delete(intervalSeconds);
    }
}

type UnitDescriptor = [Intl.RelativeTimeFormatUnit, number?, boolean?];

function isUnitDescriptor(unit: unknown): unit is UnitDescriptor {
    return isArray(unit) && typeof unit[0] === 'string';
}

type Breakpoint = RequireOnlyOne<{
    within: UnitDescriptor;
    equals: UnitDescriptor;
}>

type DisplayAs = {
    display: UnitDescriptor | ReactNode;
    updateIntervalInSeconds?: number;
    capitalize?: boolean;
}

export type RangeDescriptor = Breakpoint & DisplayAs;

function normalizeRangeDescriptor(unit: NonNullable<Props['units']>[number]): RangeDescriptor {
    if (typeof unit === 'string' || typeof unit === 'number') {
        return STANDARD_UNITS[unit];
    }
    if (isUnitDescriptor(unit)) {
        const [u, n] = unit;
        return {within: [u, n], display: [u]};
    }
    return unit;
}

export type ResolvedFormats = {
    relative: RelativeOptions | SimpleRelativeOptions | false;
    date: DateTimeOptions | false;
    time: DateTimeOptions | false;
}

type FormattedParts = {
    relative?: ReactNode;
    date?: ReactNode;
    time?: ReactNode;
}

type FormatOptions = DateTimeOptions & Partial<RelativeOptions>;

export type Props = FormatOptions & {
    value?: ConstructorParameters<typeof Date>[0];

    useRelative?: Resolvable<ResolvedFormats['relative'], {value: Date}, FormatOptions>;
    units?: Array<RangeDescriptor | UnitDescriptor | Intl.RelativeTimeFormatUnit | keyof typeof STANDARD_UNITS>;
    ranges?: Props['units'];
    useDate?: Resolvable<Exclude<ResolvedFormats['date'], 'timeZone'> | false, {value: Date}, FormatOptions>;
    useTime?: Resolvable<Exclude<ResolvedFormats['time'], 'timeZone' | 'hourCycle' | 'hour12'> | false, {value: Date}, FormatOptions>;

    children?: Resolvable<ReactNode, {value: Date; timeZone: DateTimeOptions['timeZone']; formatted: ReactNode} & FormattedParts, ResolvedFormats>;
    className?: string;
    label?: string;
    useSemanticOutput?: boolean;

    intl: IntlShape;
}

type State = {
    now: Date;
    prevValue: Props['value'];
}

/**
 * A feature-rich, react-intl oriented wrapper around Intl.DateTimeFormat and Intl.RelativeTimeFormat.
 *
 * If (for some odd reason) Intl.DateTimeFormat does not support the specified timezone, Moment will be used as a fallback formatter.
 * This fallback implementation only supports the following non-localized formats:
 *
 * TIME:
 * - `h:mm A`
 * - `HH:mm`
 *
 * DATE:
 * - `dddd`
 * - `MMMM DD`
 * - `MMMM DD, YYYY`
 * - `dddd, MMMM DD, YYYY`
 *
 * `DateTimeOptions.hourCycle` is preferred over `DateTimeOptions.hour12`.
 *
 * `hour12` will override the specified `hourCycle` and will defer to the default locale `hourCycle`.
 * This might result in `H24` behavior. (See https://github.com/formatjs/formatjs/issues/1577)
 *
 * @remarks Fallback-formatting should be rare, as `Intl.DateTimeFormat` (in Chrome, Safari, FF, and Edge) supports all timezones that are supported by `moment-timezone`.
 */
class Timestamp extends PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            now: new Date(),
            prevValue: props.value,
        };
    }

    static defaultProps: Partial<Props> = {

        // relative
        numeric: 'auto',
        style: 'long',
        relNearest: 1,

        // fixed
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h12',
        timeZoneName: 'short',
    };
    tickIntervalSeconds: number | null = null;
    mounted = false;

    private handleTick = () => {
        if (this.mounted) {
            this.setState({now: new Date()});
        }
    };

    componentDidMount() {
        this.mounted = true;
        this.updateTickSubscription();
    }

    componentDidUpdate() {
        this.updateTickSubscription();
    }

    private get parsedValue(): Date {
        const {value = this.state.now} = this.props;
        return value instanceof Date ? value : new Date(value);
    }

    private updateTickSubscription() {
        const {relative} = this.getFormats(this.parsedValue);
        const intervalSeconds = relative && relative.updateIntervalInSeconds ? relative.updateIntervalInSeconds : null;

        if (intervalSeconds === this.tickIntervalSeconds) {
            return;
        }

        if (this.tickIntervalSeconds != null) {
            unsubscribeFromTick(this.tickIntervalSeconds, this.handleTick);
        }

        if (intervalSeconds != null) {
            subscribeToTick(intervalSeconds, this.handleTick);
        }

        this.tickIntervalSeconds = intervalSeconds;
    }

    formatParts(value: Date, {relative: relFormat, date: dateFormat, time: timeFormat}: ResolvedFormats): FormattedParts {
        try {
            let relative: FormattedParts['relative'];
            let date: FormattedParts['date'];
            let time: FormattedParts['time'];

            if (isSimpleRelative(relFormat)) {
                relative = relFormat.message;
            } else if (isRelative(relFormat)) {
                relative = this.formatRelative(value, relFormat);

                if (relFormat.unit !== 'day' || !timeFormat) {
                    return {relative};
                }
            }

            if (relative == null && dateFormat) {
                date = this.formatDateTime(value, dateFormat);
            }

            if (timeFormat) {
                const {
                    hourCycle,
                    hour12 = supportsHourCycle ? undefined : is12HourTime(hourCycle),
                } = this.props;

                time = this.formatDateTime(value, {hourCycle, hour12, ...timeFormat});
            }

            return {relative, date, time};
        } catch {
            // fallback to moment for unsupported timezones
            const {timeZone, hourCycle, hour12} = this.props;

            const momentValue = moment.utc(value.getTime());

            if (timeZone) {
                momentValue.tz(timeZone);
            }

            return {
                date: dateFormat && Timestamp.momentDate(momentValue, {...dateFormat}),
                time: timeFormat && Timestamp.momentTime(momentValue, {hourCycle, hour12, ...timeFormat}),
            };
        }
    }

    formatRelative(value: Date, {unit, relNearest, truncateEndpoints, ...format}: RelativeOptions): string {
        let diff: number;

        if (relNearest === 0) {
            diff = 0;
        } else {
            diff = getDiff(value, this.state.now, this.props.timeZone, unit, truncateEndpoints);
            if (relNearest != null) {
                diff = Math.round(diff / relNearest) * relNearest;
            }
        }

        if (diff === 0) {
            diff = value <= this.state.now ? -0 : +0;
        }

        const rel = this.props.intl.formatRelativeTime(diff, unit, format);
        return format.capitalize ? caps(rel) : rel;
    }

    formatDateTime(value: Date, format: DateTimeOptions): string {
        const {timeZone, intl: {locale}} = this.props;

        const normalizedLocale = locale === 'en' ? 'en-GB' : locale;

        return getCachedDateTimeFormat(normalizedLocale, timeZone, format).format(value);
    }

    static momentTime(value: Moment, {hour, minute, hourCycle, hour12}: DateTimeOptions): string | undefined {
        if (hour && minute) {
            return value.format(is12HourTime(hourCycle, hour12) ? 'h:mm A' : 'HH:mm');
        }
        return undefined;
    }

    static momentDate(value: Moment, {weekday, day, month, year}: DateTimeOptions): string | undefined {
        if (weekday && day && month && year) {
            return value.format('dddd, MMMM DD, YYYY');
        } else if (day && month && year) {
            return value.format('MMMM DD, YYYY');
        } else if (day && month) {
            return value.format('MMMM DD');
        } else if (weekday) {
            return value.format('dddd');
        }
        return undefined;
    }

    autoRange(value: Date, units: Props['units'] = (this.props.units || this.props.ranges)): DisplayAs {
        return units?.map(normalizeRangeDescriptor).find(({equals, within}) => {
            if (equals != null) {
                return isEqual(value, this.state.now, this.props.timeZone, ...equals);
            }
            if (within != null) {
                return isWithin(value, this.state.now, this.props.timeZone, ...within);
            }
            return false;
        }) ?? {
            display: [this.props.unit],
            updateIntervalInSeconds: this.props.updateIntervalInSeconds,
        };
    }

    private formatsCache: {props: Props; valueTime: number; nowTime: number; formats: ResolvedFormats} | null = null;

    private getFormats(value: Date): ResolvedFormats {
        const valueTime = value.getTime();
        const nowTime = this.state.now.getTime();
        const cached = this.formatsCache;
        if (cached && cached.props === this.props && cached.valueTime === valueTime && cached.nowTime === nowTime) {
            return cached.formats;
        }

        const {
            numeric,
            style,
            useRelative = (): ResolvedFormats['relative'] => {
                const {
                    display,
                    updateIntervalInSeconds = this.props.updateIntervalInSeconds,
                    capitalize = this.props.capitalize,
                } = this.autoRange(value);

                if (display) {
                    if (isValidElementType(display) || !Array.isArray(display)) {
                        return {
                            message: display,
                            updateIntervalInSeconds,
                        };
                    }

                    const [
                        unit,
                        relNearest = this.props.relNearest,
                        truncateEndpoints = this.props.truncateEndpoints,
                    ] = display as UnitDescriptor;

                    if (unit) {
                        return {
                            unit,
                            relNearest,
                            truncateEndpoints,
                            numeric,
                            style,
                            updateIntervalInSeconds: updateIntervalInSeconds ?? defaultRefreshIntervals.get(unit),
                            capitalize,
                        };
                    }
                }

                return false;
            },
            year,
            month,
            day,
            weekday,
            hour,
            minute,
            useDate = (): ResolvedFormats['date'] => {
                if (isSameYear(value, this.state.now)) {
                    return {weekday, day, month};
                }

                return {year, month, day};
            },
            useTime = {hour, minute},
        } = this.props;

        const relative = resolve(useRelative, {value}, this.props);
        const date = !relative && resolve(useDate, {value}, this.props);
        const time = resolve(useTime, {value}, this.props);

        const formats = {relative, date, time};
        this.formatsCache = {props: this.props, valueTime, nowTime, formats};
        return formats;
    }

    componentWillUnmount() {
        this.mounted = false;
        if (this.tickIntervalSeconds != null) {
            unsubscribeFromTick(this.tickIntervalSeconds, this.handleTick);
            this.tickIntervalSeconds = null;
        }
    }

    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.value !== state.prevValue) {
            return ({now: new Date(), prevValue: props.value});
        }

        return null;
    }

    static format({relative, date, time}: FormattedParts, capitalize?: boolean): ReactNode {
        let relativeOrDate = relative || date;

        if (typeof relativeOrDate === 'string') {
            relativeOrDate = capitalize ? upperFirst(relativeOrDate) : relativeOrDate;
        }

        return relativeOrDate && time ? (
            <FormattedMessage
                id='timestamp.datetime'
                defaultMessage='{relativeOrDate} at {time}'
                values={{
                    relativeOrDate,
                    time,
                }}
            />
        ) : relativeOrDate || time;
    }

    static formatLabel(value: Date, timeZone?: string) {
        const momentValue = moment(value);

        if (timeZone) {
            momentValue.tz(timeZone);
        }

        return momentValue.toString() + (timeZone ? ` (${momentValue.tz()})` : '');
    }

    render() {
        const {
            children,
            useSemanticOutput = true,
            timeZone,
            label,
            className,
        } = this.props;

        const value = this.parsedValue;
        const formats = this.getFormats(value);
        const parts = this.formatParts(value, formats);
        let formatted = Timestamp.format(parts, this.props.capitalize);

        if (useSemanticOutput) {
            formatted = (
                <SemanticTime
                    value={value}
                    aria-label={label}
                    className={className}
                >
                    {formatted}
                </SemanticTime>
            );
        }

        if (children) {
            return resolve(children, {value, timeZone, formatted, ...parts}, formats);
        }

        return formatted;
    }
}

export default injectIntl(Timestamp);
