// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover';

export enum AudioPlayerState {
    Playing = 'PLAYING',
    Paused = 'PAUSED',
    Stopped = 'STOPPED',
}

function getThemeColor(container: HTMLElement, variable: string, fallback: string) {
    return getComputedStyle(container).getPropertyValue(variable).trim() || fallback;
}

export function useWaveSurferPlayer(src?: string, initialPlaybackRate = 1) {
    const [playerState, setPlayerState] = useState<AudioPlayerState>(AudioPlayerState.Stopped);
    const [duration, setDuration] = useState(0);
    const [elapsed, setElapsedTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(initialPlaybackRate);
    const [isReady, setIsReady] = useState(false);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    const waveSurferRef = useRef<WaveSurfer | null>(null);
    const playbackRateRef = useRef(initialPlaybackRate);

    useEffect(() => {
        if (!container || !src) {
            return undefined;
        }

        const centerChannelColorRgb = getThemeColor(container, '--center-channel-color-rgb', '128, 128, 128');
        const buttonBgColor = getThemeColor(container, '--button-bg', '#808080');
        const centerChannelBgColor = getThemeColor(container, '--center-channel-bg', '#ffffff');

        const waveSurfer = WaveSurfer.create({
            container,
            url: src,
            height: 24,
            normalize: true,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            waveColor: `rgba(${centerChannelColorRgb}, 0.32)`,
            progressColor: buttonBgColor,
            cursorColor: buttonBgColor,
            cursorWidth: 1,
            audioRate: playbackRateRef.current,
            dragToSeek: true,
            plugins: [
                Hover.create({
                    lineColor: `rgba(${centerChannelColorRgb}, 0.56)`,
                    lineWidth: 1,
                    labelBackground: buttonBgColor,
                    labelColor: centerChannelBgColor,
                }),
            ],
        });

        waveSurferRef.current = waveSurfer;

        const unsubscribers = [
            waveSurfer.on('ready', () => {
                setIsReady(true);
                setDuration(waveSurfer.getDuration() ?? 0);
            }),
            waveSurfer.on('timeupdate', (time: number) => setElapsedTime(time)),
            waveSurfer.on('play', () => setPlayerState(AudioPlayerState.Playing)),
            waveSurfer.on('pause', () => setPlayerState(AudioPlayerState.Paused)),
            waveSurfer.on('error', () => {
                setIsReady(false);
                setPlayerState(AudioPlayerState.Stopped);
            }),
            waveSurfer.on('finish', () => {
                waveSurfer.setTime(0);
                setPlayerState(AudioPlayerState.Stopped);
                setElapsedTime(0);
            }),
        ];

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
            waveSurferRef.current = null;
            waveSurfer.destroy();
            setIsReady(false);
            setDuration(0);
            setElapsedTime(0);
            setPlayerState(AudioPlayerState.Stopped);
        };
    }, [src, container]);

    useEffect(() => {
        playbackRateRef.current = playbackRate;
        waveSurferRef.current?.setPlaybackRate(playbackRate);
    }, [playbackRate]);

    const togglePlayPause = useCallback(() => {
        if (waveSurferRef.current && isReady) {
            waveSurferRef.current.playPause();
        }
    }, [isReady]);

    return {
        playerState,
        duration,
        elapsed,
        playbackRate,
        togglePlayPause,
        setPlaybackRate,
        containerRef: setContainer,
    };
}
