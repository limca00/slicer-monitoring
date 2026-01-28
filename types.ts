
export type VariantType = 'FC' | 'RC';
export type ShiftType = 'A' | 'B' | 'C';

export interface SliceSpec {
  variant: VariantType;
  solidRange: string;
  ll: number;
  ul: number;
}

export interface ExtractionResult {
  date: string | null; // Format: YYYY/MM/DD
  time: string | null; // Format: HH:MM
  max_thickness: number | null;
  min_thickness: number | null;
  x_bar: number | null;
}

export type ResultStatus = 'OK' | 'OUT_OF_RANGE_LOW' | 'OUT_OF_RANGE_HIGH' | 'UNKNOWN';

export interface InspectionRecord {
  id: string;
  timestamp: string; // The OCR timestamp normalized to ISO or combined
  slicerId: string;
  variant: VariantType;
  solidRange: string;
  extractedDate: string; // YYYY-MM-DD
  extractedTime: string; // HH:MM
  measuredXBar: number | null;
  maxMeasured: number | null;
  minMeasured: number | null;
  ll: number;
  ul: number;
  status: ResultStatus;
}
