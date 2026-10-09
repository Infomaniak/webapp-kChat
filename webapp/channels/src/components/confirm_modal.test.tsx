// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import ConfirmModal from './confirm_modal';

describe('ConfirmModal', () => {
    const baseProps = {
        show: true,
        onConfirm: jest.fn(),
        onCancel: jest.fn(),
    };

    test('should pass checkbox state when confirm is pressed', () => {
        const props = {
            ...baseProps,
            showCheckbox: true,
        };

        const wrapper = shallow(<ConfirmModal {...props}/>);

        expect(wrapper.state('checked')).toBe(false);
        expect(wrapper.find('input[type="checkbox"]').prop('checked')).toBe(false);
        expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);

        wrapper.find('#confirmModalButton').simulate('click');

        expect(props.onConfirm).toHaveBeenCalledWith(false);

        wrapper.find('input[type="checkbox"]').simulate('change', {target: {checked: true}});

        expect(wrapper.state('checked')).toBe(true);
        expect(wrapper.find('input[type="checkbox"]').prop('checked')).toBe(true);

        wrapper.find('#confirmModalButton').simulate('click');

        expect(props.onConfirm).toHaveBeenCalledWith(true);
    });

    test('should pass checkbox state when cancel is pressed', () => {
        const props = {
            ...baseProps,
            showCheckbox: true,
        };

        const wrapper = shallow(<ConfirmModal {...props}/>);

        expect(wrapper.state('checked')).toBe(false);
        expect(wrapper.find('input[type="checkbox"]').prop('checked')).toBe(false);
        expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);

        wrapper.find('#cancelModalButton').simulate('click');

        expect(props.onCancel).toHaveBeenCalledWith(false);

        wrapper.find('input[type="checkbox"]').simulate('change', {target: {checked: true}});

        expect(wrapper.state('checked')).toBe(true);
        expect(wrapper.find('input[type="checkbox"]').prop('checked')).toBe(true);

        wrapper.find('#cancelModalButton').simulate('click');

        expect(props.onCancel).toHaveBeenCalledWith(true);
    });

    test('should apply the btn base class when confirmButtonClass only has a variant', () => {
        const props = {
            ...baseProps,
            confirmButtonClass: 'btn-danger',
        };

        const wrapper = shallow(<ConfirmModal {...props}/>);

        expect(wrapper.find('#confirmModalButton').prop('className')).toBe('btn btn-danger');
    });

    test('should keep a complete confirmButtonClass unchanged', () => {
        const props = {
            ...baseProps,
            confirmButtonClass: 'btn btn-danger',
        };

        const wrapper = shallow(<ConfirmModal {...props}/>);

        expect(wrapper.find('#confirmModalButton').prop('className')).toBe('btn btn-danger');
    });

    test('should keep the default confirm button class unchanged', () => {
        const wrapper = shallow(<ConfirmModal {...baseProps}/>);

        expect(wrapper.find('#confirmModalButton').prop('className')).toBe('btn btn-primary');
    });
});
