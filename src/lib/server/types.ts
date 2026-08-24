export type Palette = { colors: string[]; field: string; onLight: string; onDark: string };

export type Country = {
	code: string;
	cca3: string;
	name: string;
	official: string;
	native: string | null;
	capital: string | null;
	capitalLatLng: [number, number];
	timezone: string;
	region: string;
	subregion: string | null;
	population: number | null;
	populationYear: string | null;
	area: number | null;
	languages: string[];
	currencies: { code: string; name: string; symbol: string | null }[];
	callingCode: string | null;
	tld: string | null;
	demonym: string | null;
	landlocked: boolean;
	borders: string[];
	flag: { src: string; ratio: number; emoji: string; rectangular: boolean };
	palette: Palette;
};
