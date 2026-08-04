import { useCallback, useRef } from 'react';
import store, { authSlice } from '../../store';
import {
  getTokenExpiration,
  saveAnonTokenToLocalStorage,
  scheduleAction,
  fetchAnonTokenUsingService,
  removeItemFromLocalStorage,
} from '../authHelpers';
import {
  LOCAL_STORAGE_RECAPTCHA_CONSENT_KEY,
  MAX_NUM_ANON_TOKEN_REQUESTS,
  UPDATE_BEFORE_EXPIRY_ANON_TOKEN,
} from '../../const';

let anonTokenRefreshTimeout = null;
let anonTokenRequestsCounter = 0;

const useAnonymousAuthRecaptcha = () => {
  const captchaRef = useRef(null);
  // Tracks whether a captcha execution is still awaiting its onExecute/onError callback,
  // so a concurrent trigger (user retry, scheduled token refresh, post-logout re-auth) can't
  // fire a second request against the shared captchaRef.
  const anonAuthRequestInFlightRef = useRef(false);

  // Guards captchaRef.executeCaptcha() call sites that are genuine new triggers (button click,
  // post-logout re-auth, scheduled token refresh) against firing while one is already in flight.
  // NOT used for the post-script-load continuation in AuthProvider's initialAnonAuth — that call
  // resumes a request already marked in-flight by the triggering click, so gating it on the same
  // flag would deadlock it.
  const executeCaptchaIfNotInFlight = useCallback(() => {
    if (anonAuthRequestInFlightRef.current) {
      return;
    }
    anonAuthRequestInFlightRef.current = true;
    captchaRef.current.executeCaptcha();
  }, []);

  const saveAndDispatchToken = ({ token }) => {
    saveAnonTokenToLocalStorage(token);
    store.dispatch(authSlice.actions.setAnonToken(token?.access_token));
    if (token) {
      let action;
      // We don't want to request new anonymous tokens indefinitely as many users don't close tabs/browsers
      // which results in app not doing anything but requesting new anonymous tokens.
      // To prevent this, the number of token refreshes is limited to MAX_NUM_ANON_TOKEN_REQUESTS.
      // After that, user will be prompted to log in or continue anonymously.
      if (anonTokenRequestsCounter < MAX_NUM_ANON_TOKEN_REQUESTS) {
        //schedule refresh if refresh limit is not reached
        action = executeCaptchaIfNotInFlight;
      } else {
        //schedule dialog popup when refresh limit is reached
        action = clearAnonTokenAndRecaptchaConsent;
      }

      anonTokenRefreshTimeout = scheduleAction(
        getTokenExpiration(token),
        UPDATE_BEFORE_EXPIRY_ANON_TOKEN,
        anonTokenRefreshTimeout,
        action,
      );
    }
  };

  const clearAnonTokenAndRecaptchaConsent = useCallback(() => {
    saveAnonTokenToLocalStorage(null);
    removeItemFromLocalStorage(LOCAL_STORAGE_RECAPTCHA_CONSENT_KEY);
    store.dispatch(authSlice.actions.setAnonToken(null));
  }, []);

  const clearAnonTokenRefresh = useCallback(() => {
    anonTokenRequestsCounter = 0;
    if (anonTokenRefreshTimeout) {
      clearTimeout(anonTokenRefreshTimeout);
    }
  }, []);

  const getAnonymousToken = async (siteResponse) => {
    try {
      //fetch new anonymous token
      const anonToken = await fetchAnonTokenUsingService(import.meta.env.VITE_ANON_AUTH_SERVICE_URL, {
        siteResponse,
      });

      //increment anonynous token request counter
      anonTokenRequestsCounter = anonTokenRequestsCounter + 1;

      if (!anonToken) {
        // No token obtained (request failed or timed out). Clearing the consent flag too —
        // not just the token — is what lets EnsureAuth's modal reappear: consent alone stays
        // true forever once given, so without this the user would be stuck with no visible
        // way to retry.
        clearAnonTokenAndRecaptchaConsent();
        return null;
      }

      // save token and schedule refresh
      saveAndDispatchToken({ token: anonToken });
      return anonToken;
    } catch (err) {
      console.error(err.message);
      clearAnonTokenAndRecaptchaConsent();
      return null;
    }
  };

  return {
    saveAndDispatchToken,
    clearAnonTokenRefresh,
    getAnonymousToken,
    captchaRef,
    anonAuthRequestInFlightRef,
    executeCaptchaIfNotInFlight,
    clearAnonTokenAndRecaptchaConsent,
  };
};

export default useAnonymousAuthRecaptcha;
