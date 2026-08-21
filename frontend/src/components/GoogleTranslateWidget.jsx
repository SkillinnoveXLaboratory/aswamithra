import { Languages } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'aswamithra_site_language';
const COOKIE_NAME = 'googtrans';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'ur', label: 'Urdu' },
];

function readTranslateCookie() {
  const match = document.cookie.match(/(?:^|; )googtrans=([^;]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  const parts = value.split('/');
  return parts[2] || null;
}

function writeTranslateCookie(language) {
  const value = `/en/${language}`;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=31536000`;
}

function loadGoogleScript(onReady) {
  if (window.google?.translate?.TranslateElement) {
    onReady();
    return;
  }

  window.googleTranslateElementInit = onReady;

  const existing = document.getElementById('google-translate-script');
  if (existing) return;

  const script = document.createElement('script');
  script.id = 'google-translate-script';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.body.appendChild(script);
}

function triggerTranslate(language) {
  writeTranslateCookie(language);
  localStorage.setItem(STORAGE_KEY, language);

  if (language === 'en') {
    window.location.reload();
    return;
  }

  const apply = () => {
    const combo = document.querySelector('.goog-te-combo');
    if (!combo) return false;
    if (combo.value !== language) {
      combo.value = language;
      combo.dispatchEvent(new Event('change'));
    }
    return true;
  };

  if (apply()) return;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (apply() || attempts > 20) window.clearInterval(timer);
  }, 300);
}

export default function GoogleTranslateWidget() {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const initialLanguage = useMemo(
    () => localStorage.getItem(STORAGE_KEY) || readTranslateCookie() || 'en',
    [],
  );
  const [language, setLanguage] = useState(initialLanguage);

  useEffect(() => {
    loadGoogleScript(() => {
      if (!document.getElementById('google_translate_element')?.childNodes.length) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
            includedLanguages: languages.map((item) => item.code).join(','),
          },
          'google_translate_element',
        );
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready || language === 'en') return;
    const timer = window.setTimeout(() => {
      triggerTranslate(language);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [ready, language, location.pathname]);

  const handleChange = (event) => {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    triggerTranslate(nextLanguage);
  };

  return (
    <>
      <div id="google_translate_element" className="google-translate-anchor" aria-hidden="true" />
      <label className="google-translate-widget" htmlFor="global-language-select">
        <span className="google-translate-label">
          <Languages size={16} />
          Language
        </span>
        <select id="global-language-select" value={language} onChange={handleChange}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
