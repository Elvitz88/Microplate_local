import { useTranslation } from 'react-i18next';
import { MdLanguage } from 'react-icons/md';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <div className="flex items-center gap-2">
      <MdLanguage className="w-5 h-5" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-1 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
        aria-label="Language selector"
      >
        <option value="en">English</option>
        <option value="th">ไทย</option>
      </select>
    </div>
  );
}

