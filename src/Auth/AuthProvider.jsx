import React, { useCallback, useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { t } from 'ttag';
import {
  getAnonTokenFromLocalStorage,
  initKeycloak,
  saveAnonTokenToLocalStorage,
  saveRecaptchaConsentToLocalStorage,
} from './authHelpers';
import UserTokenRefresh from './UserTokenRefresh';
import EnsureAuth from './EnsureAuth';
import { Captcha } from './AnonymousAuthRecaptcha/Captcha';
import useAnonymousAuthRecaptcha from './AnonymousAuthRecaptcha/useAnonymousAuthRecaptcha';
import { usePrevious } from '../hooks/usePrevious';

import './Auth.scss';
import store, { authSlice, notificationSlice } from '../store';
import { ModalId } from '../const';

// If the recaptcha script fails to load or silently never invokes onExecute/onError
// (e.g. blocked by an ad-blocker), this bounds how long the "Anonymously" button stays disabled.
const ANON_AUTH_TIMEOUT_MS = 15000;

const AuthProvider = ({ user, anonToken, tokenRefreshInProgress, modalId, children }) => {
  const blockingModalOpen = modalId === ModalId.PRIVATE_THEMEID_LOGIN;
  const [userAuthCompleted, setUserAuthCompleted] = useState(false);
  const [, setAnonAuthCompleted] = useState(false);
  const [anonAuthInProgress, setAnonAuthInProgress] = useState(false);

  const {
    saveAndDispatchToken,
    getAnonymousToken,
    captchaRef,
    clearAnonTokenRefresh,
    anonAuthRequestInFlightRef,
    executeCaptchaIfNotInFlight,
    clearAnonTokenAndRecaptchaConsent,
  } = useAnonymousAuthRecaptcha();

  const prevUser = usePrevious(user);
  const anonAuthTimeoutRef = useRef(null);
  // Tracks whether the currently in-flight captcha execution was triggered by the user
  // clicking "Anonymously" (executeAnonAuth), as opposed to a silent background trigger
  // (initial mount re-auth for a returning user, post-logout re-auth, or a scheduled token
  // refresh). Only a user-initiated attempt should flip anonAuthInProgress — and with it,
  // EnsureAuth's modal escape hatch — otherwise a silent background refresh briefly flashes
  // the login modal open for a returning user who already has consent.
  const isUserInitiatedAnonAuthRef = useRef(false);

  const clearAnonAuthTimeout = useCallback(() => {
    if (anonAuthTimeoutRef.current) {
      clearTimeout(anonAuthTimeoutRef.current);
      anonAuthTimeoutRef.current = null;
    }
  }, []);

  const executeAnonAuth = useCallback(() => {
    if (anonAuthRequestInFlightRef.current) {
      return;
    }
    isUserInitiatedAnonAuthRef.current = true;
    setAnonAuthInProgress(true);
    saveRecaptchaConsentToLocalStorage();
    captchaRef.current.loadCaptchaScript();
    executeCaptchaIfNotInFlight();

    clearAnonAuthTimeout();
    anonAuthTimeoutRef.current = setTimeout(() => {
      setAnonAuthInProgress(false);
      anonAuthRequestInFlightRef.current = false;
      isUserInitiatedAnonAuthRef.current = false;
      // Also clears recaptcha consent: consent alone stays true forever once given, and
      // anonAuthInProgress is transient, so without this the modal would never reappear —
      // leaving the user stuck with a disabled button and no way to retry.
      clearAnonTokenAndRecaptchaConsent();
      store.dispatch(
        notificationSlice.actions.displayError(
          t`Anonymous sign-in is taking longer than expected. Please try again.`,
        ),
      );
    }, ANON_AUTH_TIMEOUT_MS);
  }, [
    captchaRef,
    clearAnonAuthTimeout,
    executeCaptchaIfNotInFlight,
    anonAuthRequestInFlightRef,
    clearAnonTokenAndRecaptchaConsent,
  ]);

  const initialAnonAuth = async () => {
    clearAnonTokenRefresh();
    let anonToken = await getAnonTokenFromLocalStorage();
    if (anonToken) {
      saveAndDispatchToken({ token: anonToken });
      setAnonAuthCompleted(true);
    } else {
      // Not guarded by executeCaptchaIfNotInFlight: on a fresh session this fires right after
      // the recaptcha script finishes loading, continuing the same request that executeAnonAuth
      // already marked in-flight (its own immediate executeCaptcha call is a no-op until the
      // script has loaded, since window.grecaptcha is undefined until then). Gating this call on
      // the same flag would permanently deadlock the first-ever anonymous sign-in.
      anonAuthRequestInFlightRef.current = true;
      captchaRef.current.executeCaptcha();
    }
  };

  useEffect(() => {
    const initialUserAuth = async () => {
      const authenticatedUser = await initKeycloak();

      if (authenticatedUser) {
        store.dispatch(authSlice.actions.setAnonToken(null));
        saveAnonTokenToLocalStorage(null);
        clearAnonTokenRefresh();
        setAnonAuthCompleted(true);
      }
      setUserAuthCompleted(true);
    };

    initialUserAuth();
  }, [clearAnonTokenRefresh]);

  useEffect(() => {
    if (!user && prevUser) {
      setUserAuthCompleted(false);
      setAnonAuthCompleted(false);
      executeCaptchaIfNotInFlight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, prevUser]);

  useEffect(() => {
    return clearAnonAuthTimeout;
  }, [clearAnonAuthTimeout]);

  return (
    <>
      <Captcha
        ref={captchaRef}
        onExecute={async (siteResponse) => {
          clearAnonAuthTimeout();
          setAnonAuthCompleted(false);
          const isUserInitiated = isUserInitiatedAnonAuthRef.current;
          if (isUserInitiated) {
            setAnonAuthInProgress(true);
          }
          const token = await getAnonymousToken(siteResponse);
          if (isUserInitiated && !token) {
            store.dispatch(
              notificationSlice.actions.displayError(t`Anonymous sign-in failed. Please try again.`),
            );
          }
          setAnonAuthCompleted(true);
          setAnonAuthInProgress(false);
          anonAuthRequestInFlightRef.current = false;
          isUserInitiatedAnonAuthRef.current = false;
        }}
        onLoad={async () => {
          await initialAnonAuth();
        }}
        onError={(e) => {
          clearAnonAuthTimeout();
          console.log('onError', e);
          setAnonAuthInProgress(false);
          anonAuthRequestInFlightRef.current = false;
          isUserInitiatedAnonAuthRef.current = false;
          clearAnonTokenAndRecaptchaConsent();
        }}
        sitekey={import.meta.env.VITE_CAPTCHA_SITE_KEY}
        action="LOGIN"
      ></Captcha>
      <EnsureAuth
        user={user}
        anonToken={anonToken}
        userAuthCompleted={userAuthCompleted}
        tokenRefreshInProgress={tokenRefreshInProgress}
        blockingModalOpen={blockingModalOpen}
        anonAuthInProgress={anonAuthInProgress}
        executeAnonAuth={() => {
          executeAnonAuth();
        }}
      ></EnsureAuth>
      {userAuthCompleted ? (
        <UserTokenRefresh>{children}</UserTokenRefresh>
      ) : (
        <div className="initial-loader">
          <i className="fa fa-cog fa-spin fa-3x fa-fw" />
        </div>
      )}
    </>
  );
};

const mapStoreToProps = (store) => ({
  anonToken: store.auth.anonToken,
  user: store.auth.user.userdata,
  tokenRefreshInProgress: store.auth.tokenRefreshInProgress,
  modalId: store.modal.id,
});
export default connect(mapStoreToProps)(AuthProvider);
