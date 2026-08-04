import React from 'react';
import { t } from 'ttag';
import Modal from '../components/Modal/Modal';

import UserAuth from './UserAuth';
import Button from '../components/Button/Button';

import './EnsureAuth.scss';
import ReactMarkdown from 'react-markdown';
import { REACT_MARKDOWN_REHYPE_PLUGINS } from '../rehypeConfig';
import { getRecaptchaConsentFromLocalStorage } from './authHelpers';

const AnonAuthButton = ({ executeAnonAuth, anonAuthInProgress }) => {
  return (
    <Button
      label={t`Anonymously`}
      className="login-button"
      styleClassName="label-normal-case"
      isLoading={anonAuthInProgress}
      disabled={anonAuthInProgress}
      onClick={executeAnonAuth}
    />
  );
};

const LoginRequired = ({ user, executeAnonAuth, anonAuthInProgress }) => (
  <Modal
    animation="slideUp"
    customStyles={{
      height: '250px',
      bottom: 'auto',
      width: '550px',
      maxWidth: '90vw',
      top: '40vh',
      overflow: 'auto',
    }}
    visible={true}
    showCloseButton={false}
    closeOnEsc={false}
    className="ensure-auth"
    onClose={() => {}}
  >
    <div className="ensure-user-logged-in-modal-text">{t`To continue browsing, please log in or continue anonymously.`}</div>
    <div className="actions">
      <UserAuth user={user} />
      <AnonAuthButton executeAnonAuth={executeAnonAuth} anonAuthInProgress={anonAuthInProgress} />
    </div>
    <div className="recaptcha-cookie-notice">
      <ReactMarkdown rehypePlugins={REACT_MARKDOWN_REHYPE_PLUGINS}>
        {t`By continuing anonymously, you consent to the use of cookies by recaptcha.net and related collection, sharing and use of personal data by recaptcha.net. Alternatively, you can sign-in. See also [Terms and conditions](https://dataspace.copernicus.eu/terms-and-conditions)`}
      </ReactMarkdown>
    </div>
  </Modal>
);

const EnsureAuth = ({
  user,
  anonToken,
  tokenRefreshInProgress,
  executeAnonAuth,
  userAuthCompleted,
  blockingModalOpen,
  anonAuthInProgress,
}) => {
  // Don't show this modal while ThemesProvider is already showing its own auth dialog
  // (private theme URL or CCM access denied) — prevents two login prompts stacking.
  if (blockingModalOpen) {
    return null;
  }

  if (
    !(anonToken || user || tokenRefreshInProgress) &&
    // executeAnonAuth saves the recaptcha consent flag in the same tick it sets
    // anonAuthInProgress, so without the anonAuthInProgress escape hatch this modal
    // would unmount before ever rendering the disabled/loading "Anonymously" button.
    // anonAuthInProgress only ever becomes true for a user-initiated click (see
    // AuthProvider's isUserInitiatedAnonAuthRef) — silent background re-auth attempts never
    // set it, so they can't flash this modal open for a returning user who already consented.
    (!getRecaptchaConsentFromLocalStorage() || anonAuthInProgress) &&
    userAuthCompleted
  ) {
    return (
      <LoginRequired user={user} executeAnonAuth={executeAnonAuth} anonAuthInProgress={anonAuthInProgress} />
    );
  }

  return null;
};

export default EnsureAuth;
