
import { SliceSpec } from './types';

export const SLICER_IDS = ['Slicer 1', 'Slicer 2', 'Slicer 3'];
export const VARIANTS = ['FC', 'RC'] as const;

export const SLICE_SPECS: SliceSpec[] = [
  { variant: "FC", solidRange: "17 - 18.5", ll: 1.194, ul: 1.600 },
  { variant: "FC", solidRange: "18.5 - 19.5", ll: 1.168, ul: 1.575 },
  { variant: "FC", solidRange: "19.5 - 20.5", ll: 1.143, ul: 1.549 },
  { variant: "FC", solidRange: "20.5 - 21.5", ll: 1.118, ul: 1.524 },
  { variant: "FC", solidRange: "21.5 - 22.5", ll: 1.092, ul: 1.499 },
  { variant: "FC", solidRange: "22.5 - 23.5", ll: 1.067, ul: 1.473 },
  { variant: "FC", solidRange: "23.5 - 24.5", ll: 1.041, ul: 1.448 },
  { variant: "FC", solidRange: "24.5 - 27", ll: 1.016, ul: 1.422 },

  { variant: "RC", solidRange: "17 - 18.5", ll: 2.616, ul: 3.023 },
  { variant: "RC", solidRange: "18.5 - 19.5", ll: 2.591, ul: 2.997 },
  { variant: "RC", solidRange: "19.5 - 20.5", ll: 2.565, ul: 2.972 },
  { variant: "RC", solidRange: "20.5 - 21.5", ll: 2.540, ul: 2.946 },
  { variant: "RC", solidRange: "21.5 - 22.5", ll: 2.515, ul: 2.921 },
  { variant: "RC", solidRange: "22.5 - 23.5", ll: 2.489, ul: 2.896 },
  { variant: "RC", solidRange: "23.5 - 24.5", ll: 2.464, ul: 2.870 },
  { variant: "RC", solidRange: "24.5 - 27", ll: 2.438, ul: 2.845 }
];
