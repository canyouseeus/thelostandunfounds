export interface ClaptropCard {
    volume: string;
    name: string;
    dcim: string;
}

export declare function discoverClaptropCards(volumesRoot?: string): ClaptropCard[];

export declare function resolveClaptropDcim(
    override?: string,
    volumesRoot?: string
): {
    dcim: string | null;
    name: string | null;
    reason: 'override' | 'single' | 'ambiguous' | 'none';
    matches: ClaptropCard[];
};
