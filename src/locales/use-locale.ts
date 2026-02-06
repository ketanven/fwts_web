import en_US from "antd/locale/en_US";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { Locale as AntdLocal } from "antd/es/locale";
import { LocalEnum } from "#/enum";

type Locale = keyof typeof LocalEnum;
type Language = {
	locale: keyof typeof LocalEnum;
	icon: string;
	label: string;
	antdLocal: AntdLocal;
};

export const LANGUAGE_MAP: Record<Locale, Language> = {
	[LocalEnum.en_US]: {
		locale: LocalEnum.en_US,
		label: "English",
		icon: "flag-us",
		antdLocal: en_US,
	},
};

export default function useLocale() {
	const { t, i18n } = useTranslation();

	const locale = LocalEnum.en_US as Locale;
	const language = LANGUAGE_MAP[LocalEnum.en_US as Locale];

	/**
	 * localstorage -> i18nextLng change
	 */
	const setLocale = (_locale: Locale) => {
		i18n.changeLanguage(LocalEnum.en_US);
		document.documentElement.lang = LocalEnum.en_US;
		dayjs.locale(LocalEnum.en_US);
	};

	return {
		t,
		locale,
		language,
		setLocale,
	};
}
