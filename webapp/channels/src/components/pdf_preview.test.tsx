// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import type {PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist';
import React from 'react';

import PDFPreview from 'components/pdf_preview';
import type {Props} from 'components/pdf_preview';

import {TestHelper} from 'utils/test_helper';

jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => {
    return {
        getDocument: jest.fn(() => ({
            promise: Promise.resolve({
                numPages: 3,
                getPage: jest.fn(),
                destroy: jest.fn(),
            }),
            destroy: jest.fn(),
        })),
    };
});

describe('component/PDFPreview', () => {
    const requiredProps: Props = {
        fileInfo: TestHelper.getFileInfoMock({extension: 'pdf'}),
        fileUrl: 'https://pre-release.mattermost.com/api/v4/files/ips59w4w9jnfbrs3o94m1dbdie',
        scale: 1,
        handleBgClose: jest.fn(),
    };

    test('should match snapshot, loading', () => {
        const wrapper = shallow(
            <PDFPreview {...requiredProps}/>,
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('should match snapshot, not successful', () => {
        const wrapper = shallow(
            <PDFPreview {...requiredProps}/>,
        );
        wrapper.setState({loading: false});
        expect(wrapper).toMatchSnapshot();
    });

    test('should update state with new value from props when prop changes', () => {
        const wrapper = shallow<PDFPreview>(
            <PDFPreview {...requiredProps}/>,
        );
        const newFileUrl = 'https://some-new-url';

        wrapper.setProps({fileUrl: newFileUrl});
        const {prevFileUrl} = wrapper.instance().state;
        expect(prevFileUrl).toEqual(newFileUrl);
    });

    test('should return correct state when onDocumentLoad is called', () => {
        const wrapper = shallow<PDFPreview>(
            <PDFPreview {...requiredProps}/>,
        );

        let pdf = {numPages: 0} as PDFDocumentProxy;
        wrapper.instance().onDocumentLoad(pdf);
        expect(wrapper.state('pdf')).toEqual(pdf);
        expect(wrapper.state('numPages')).toEqual(pdf.numPages);

        pdf = {
            numPages: 100,
            getPage: async (i) => {
                const page = {pageNumber: i} as PDFPageProxy;
                return Promise.resolve(page);
            },
        } as PDFDocumentProxy;
        wrapper.instance().onDocumentLoad(pdf);
        expect(wrapper.state('pdf')).toEqual(pdf);
        expect(wrapper.state('numPages')).toEqual(pdf.numPages);
    });

    test('should destroy previous pdf on unmount if loaded', async () => {
        const wrapper = shallow<PDFPreview>(
            <PDFPreview {...requiredProps}/>,
        );

        await new Promise((resolve) => setTimeout(resolve, 10));
        wrapper.update();

        const instance = wrapper.instance();
        const pdf = instance.prevPdf!;

        wrapper.unmount();

        expect(pdf.destroy).toHaveBeenCalled();
    });

    test('should abort loading task on unmount if pdf not yet loaded', () => {
        const wrapper = shallow<PDFPreview>(
            <PDFPreview {...requiredProps}/>,
        );

        const instance = wrapper.instance();
        const loadingTask = instance.pdfLoadingTask!;

        wrapper.unmount();

        expect(loadingTask.destroy).toHaveBeenCalled();
    });
});
