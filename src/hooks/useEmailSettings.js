/**
 * useEmailSettings Hook
 *
 * Domain-specific hook for email settings management.
 * Settings are stored in localStorage (browser-specific, not synced across devices).
 */

import { useState, useCallback } from 'react';
import { apiRequest } from './useApi';

const EMAIL_SETTINGS_KEY = 'manity_email_settings';

/**
 * Load email settings from localStorage
 */
const loadEmailSettingsFromStorage = () => {
  try {
    const stored = localStorage.getItem(EMAIL_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        smtpServer: parsed.smtpServer || '',
        smtpPort: parsed.smtpPort || 25,
        fromAddress: parsed.fromAddress || '',
        useTLS: parsed.useTLS ?? false
      };
    }
  } catch (e) {
    console.error('Failed to load email settings from localStorage', e);
  }
  return {
    smtpServer: '',
    smtpPort: 25,
    fromAddress: '',
    useTLS: false
  };
};

/**
 * useEmailSettings hook for managing email configuration
 */
export const useEmailSettings = () => {
  const [emailSettings, setEmailSettings] = useState(loadEmailSettingsFromStorage);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const refreshEmailSettings = useCallback(() => {
    const loaded = loadEmailSettingsFromStorage();
    setEmailSettings(loaded);
    return loaded;
  }, []);

  const saveEmailSettings = useCallback((settings) => {
    const toSave = {
      smtpServer: settings.smtpServer || '',
      smtpPort: settings.smtpPort || 25,
      fromAddress: settings.fromAddress || '',
      useTLS: settings.useTLS ?? false
    };

    try {
      localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save email settings to localStorage', e);
      throw new Error('Unable to save email settings');
    }

    setEmailSettings(toSave);
    return toSave;
  }, []);

  const sendEmail = useCallback(async ({ recipients, cc, bcc, subject, body }) => {
    setIsSending(true);
    setError(null);

    try {
      // Include email settings from localStorage with each request
      // Emails are sent anonymously without credentials
      const settings = loadEmailSettingsFromStorage();

      if (!settings.smtpServer) {
        throw new Error('Email server not configured. Please configure SMTP settings first.');
      }

      const result = await apiRequest('/actions/email', {
        method: 'POST',
        body: JSON.stringify({
          recipients,
          cc,
          bcc,
          subject,
          body,
          // Pass SMTP settings with request (no credentials - anonymous sending)
          smtp_server: settings.smtpServer,
          smtp_port: settings.smtpPort,
          from_address: settings.fromAddress,
          use_tls: settings.useTLS
        })
      });

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    emailSettings,
    isSending,
    error,
    refreshEmailSettings,
    saveEmailSettings,
    sendEmail,
  };
};

export default useEmailSettings;
