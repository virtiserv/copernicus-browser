import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import EnsureAuth from './EnsureAuth';
import { getRecaptchaConsentFromLocalStorage } from './authHelpers';

jest.mock('./authHelpers', () => ({
  getRecaptchaConsentFromLocalStorage: jest.fn(() => false),
}));

const baseProps = {
  user: null,
  anonToken: null,
  tokenRefreshInProgress: false,
  userAuthCompleted: true,
  blockingModalOpen: false,
};

describe('EnsureAuth', () => {
  test('shows a spinner and ignores clicks on the anonymous button while anonAuthInProgress is true', () => {
    const executeAnonAuth = jest.fn();
    const { container } = render(
      <EnsureAuth {...baseProps} anonAuthInProgress={true} executeAnonAuth={executeAnonAuth} />,
    );

    expect(container.querySelector('.fa-spinner')).toBeInTheDocument();
    expect(container.querySelector('.loader')).toBeInTheDocument();

    const anonButton = container.querySelector('.copernicus-button.login-button');
    fireEvent.click(anonButton);

    expect(executeAnonAuth).not.toHaveBeenCalled();
  });

  test('does not show a spinner and calls executeAnonAuth on click when anonAuthInProgress is false', () => {
    const executeAnonAuth = jest.fn();
    const { container } = render(
      <EnsureAuth {...baseProps} anonAuthInProgress={false} executeAnonAuth={executeAnonAuth} />,
    );

    expect(container.querySelector('.fa-spinner')).not.toBeInTheDocument();
    expect(container.querySelector('.loader')).not.toBeInTheDocument();

    const anonButton = container.querySelector('.copernicus-button.login-button');
    fireEvent.click(anonButton);

    expect(executeAnonAuth).toHaveBeenCalledTimes(1);
  });

  test('renders nothing when blockingModalOpen is true', () => {
    const { container } = render(
      <EnsureAuth
        {...baseProps}
        blockingModalOpen={true}
        anonAuthInProgress={false}
        executeAnonAuth={jest.fn()}
      />,
    );

    expect(container.querySelector('.ensure-user-logged-in-modal-text')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  describe('when recaptcha consent was already given', () => {
    afterEach(() => {
      getRecaptchaConsentFromLocalStorage.mockReturnValue(false);
    });

    test('keeps the modal open via the anonAuthInProgress escape hatch', () => {
      getRecaptchaConsentFromLocalStorage.mockReturnValue(true);
      const { container } = render(
        <EnsureAuth {...baseProps} anonAuthInProgress={true} executeAnonAuth={jest.fn()} />,
      );

      expect(container.querySelector('.ensure-user-logged-in-modal-text')).toBeInTheDocument();
    });

    test('renders nothing once anonAuthInProgress is false', () => {
      getRecaptchaConsentFromLocalStorage.mockReturnValue(true);
      const { container } = render(
        <EnsureAuth {...baseProps} anonAuthInProgress={false} executeAnonAuth={jest.fn()} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
