// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';

import type {FileInfo} from '@mattermost/types/files';

import {getFilePublicLink} from 'mattermost-redux/actions/files';
import {getFilePublicLink as selectFilePublicLink} from 'mattermost-redux/selectors/entities/files';

import CopyButton from 'components/copy_button';
import ExternalLink from 'components/external_link';
import PrintIcon from 'components/widgets/icons/print_icon';
import WithTooltip from 'components/with_tooltip';

import {FileTypes} from 'utils/constants';
import {copyToClipboard, getFileType} from 'utils/utils';

import type {GlobalState} from 'types/store';

import type {LinkInfo} from '../types';
import {isFileInfo} from '../types';

import './file_preview_modal_main_actions.scss';

const COPIED_TOOLTIP_DURATION = 2000;
const PRINT_IFRAME_CLEANUP_DELAY = 60000;

interface Props {
    showOnlyClose?: boolean;
    showClose?: boolean;
    showPublicLink?: boolean;
    filename: string;
    fileURL: string;
    fileInfo: FileInfo | LinkInfo;
    enablePublicLink: boolean;
    canDownloadFiles: boolean;
    canCopyContent: boolean;
    handleModalClose: () => void;
    content: string;
}

const FilePreviewModalMainActions: React.FC<Props> = (props: Props) => {
    const intl = useIntl();

    const selectedFilePublicLink = useSelector((state: GlobalState) => selectFilePublicLink(state)?.link);
    const dispatch = useDispatch();
    const [publicLinkCopied, setPublicLinkCopied] = useState(false);
    const printIframeRef = useRef<HTMLIFrameElement | null>(null);
    const printBlobUrlRef = useRef<string | null>(null);
    const printCleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isFileInfo(props.fileInfo) && props.enablePublicLink) {
            dispatch(getFilePublicLink(props.fileInfo.id));
        }
    }, [props.fileInfo, props.enablePublicLink]);

    useEffect(() => {
        return () => {
            if (printIframeRef.current) {
                printIframeRef.current.remove();
            }
            if (printBlobUrlRef.current) {
                URL.revokeObjectURL(printBlobUrlRef.current);
            }
            if (printCleanupRef.current) {
                clearTimeout(printCleanupRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!publicLinkCopied) {
            return () => {};
        }

        const timeoutId = setTimeout(() => {
            setPublicLinkCopied(false);
        }, COPIED_TOOLTIP_DURATION);
        return () => clearTimeout(timeoutId);
    }, [publicLinkCopied]);

    const copyPublicLink = () => {
        copyToClipboard(selectedFilePublicLink ?? '');
        setPublicLinkCopied(true);
    };

    const handlePrint = async () => {
        if (printIframeRef.current) {
            printIframeRef.current.remove();
            printIframeRef.current = null;
        }
        if (printBlobUrlRef.current) {
            URL.revokeObjectURL(printBlobUrlRef.current);
            printBlobUrlRef.current = null;
        }
        if (printCleanupRef.current) {
            clearTimeout(printCleanupRef.current);
            printCleanupRef.current = null;
        }

        let printURL = props.fileURL;
        try {
            const url = new URL(props.fileURL, window.location.origin);
            url.searchParams.delete('download');
            printURL = url.toString();
        } catch {
            window.open(props.fileURL, '_blank');
            return;
        }

        let blobUrl: string | null = null;

        try {
            const response = await fetch(printURL);
            const blob = await response.blob();
            blobUrl = URL.createObjectURL(new Blob([blob], {type: 'application/pdf'}));
            printBlobUrlRef.current = blobUrl;

            const cleanupPrint = () => {
                if (printCleanupRef.current) {
                    clearTimeout(printCleanupRef.current);
                }
                iframe.remove();
                printIframeRef.current = null;
                printCleanupRef.current = null;
                if (printBlobUrlRef.current) {
                    URL.revokeObjectURL(printBlobUrlRef.current);
                    printBlobUrlRef.current = null;
                }
            };

            const iframe = document.createElement('iframe');
            iframe.className = 'print-iframe';
            iframe.src = blobUrl;
            iframe.onload = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch {
                    cleanupPrint();
                    window.open(printURL, '_blank');
                }
            };
            document.body.appendChild(iframe);
            printIframeRef.current = iframe;

            printCleanupRef.current = setTimeout(cleanupPrint, PRINT_IFRAME_CLEANUP_DELAY);
        } catch {
            window.open(printURL, '_blank');
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                printBlobUrlRef.current = null;
            }
        }
    };

    const closeMessage = intl.formatMessage({
        id: 'full_screen_modal.close',
        defaultMessage: 'Close',
    });
    const closeButton = (
        <WithTooltip
            title={closeMessage}
            key='publicLink'
        >
            <button
                className='file-preview-modal-main-actions__action-item'
                onClick={props.handleModalClose}
                aria-label={closeMessage}
            >
                <i className='icon icon-close'/>
            </button>
        </WithTooltip>
    );

    let publicTooltipMessage;
    if (publicLinkCopied) {
        publicTooltipMessage = intl.formatMessage({
            id: 'file_preview_modal_main_actions.public_link-copied',
            defaultMessage: 'Public link copied',
        });
    } else {
        publicTooltipMessage = intl.formatMessage({
            id: 'view_image_popover.publicLink',
            defaultMessage: 'Get a public link',
        });
    }
    const publicLink = (
        <WithTooltip
            key='filePreviewPublicLink'
            title={publicTooltipMessage}
        >
            <a
                href='#'
                className='file-preview-modal-main-actions__action-item'
                onClick={copyPublicLink}
                aria-label={publicTooltipMessage}
            >
                <i className='icon icon-link-variant'/>
            </a>
        </WithTooltip>
    );

    const downloadMessage = intl.formatMessage({
        id: 'view_image_popover.download',
        defaultMessage: 'Download',
    });
    const download = (
        <WithTooltip
            key='download'
            title={downloadMessage}
        >
            <ExternalLink
                href={props.fileURL}
                className='file-preview-modal-main-actions__action-item'
                location='file_preview_modal_main_actions'
                download={props.filename}
                aria-label={downloadMessage}
            >
                <i className='icon icon-download-outline'/>
            </ExternalLink>
        </WithTooltip>
    );

    const printMessage = intl.formatMessage({
        id: 'file_preview_modal_main_actions.print',
        defaultMessage: 'Print',
    });
    const isPdf = isFileInfo(props.fileInfo) && getFileType(props.fileInfo.extension) === FileTypes.PDF;
    const print = (
        <WithTooltip
            key='print'
            title={printMessage}
        >
            <button
                className='file-preview-modal-main-actions__action-item'
                onClick={handlePrint}
                aria-label={printMessage}
            >
                <PrintIcon className='file-preview-modal-main-actions__print-icon'/>
            </button>
        </WithTooltip>
    );

    const copy = (
        <CopyButton
            className='file-preview-modal-main-actions__action-item'
            isFor={getFileType(props.fileInfo.extension) === FileTypes.TEXT ? 'text' : undefined}
            content={props.content}
        />
    );
    return (
        <div className='file-preview-modal-main-actions__actions'>
            {!props.showOnlyClose && props.canCopyContent && copy}
            {!props.showOnlyClose && props.enablePublicLink && props.showPublicLink && publicLink}
            {!props.showOnlyClose && props.canDownloadFiles && download}
            {!props.showOnlyClose && props.canDownloadFiles && isPdf && print}
            {props.showClose && closeButton}
        </div>
    );
};

FilePreviewModalMainActions.defaultProps = {
    showOnlyClose: false,
    showClose: true,
    showPublicLink: true,
};

export default memo(FilePreviewModalMainActions);
