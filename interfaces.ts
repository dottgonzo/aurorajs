export type Istring = {
  voltage: number;
  current: number;
  power: number;
};

export type Ialarm = {
  alarm: string;
};

export type IAlarm = {
  alarms: Ialarm[];
  firmware: string;
  dateprod: string;
  serial: string;
  pn: string;
  address: number;
  model: string;
  apiVersion: string;
  createdAt: number;
};

export type IAPI = {
  _id: string;
  uid: string;
  bootId: string;
  bootTime: number;
  active: boolean;
  updatedAt: number;
  date: string;
  strings: Istring[];
  grid: {
    voltage: number;
    current: number;
    power: number;
    hz: number;
  };
  DcAcCvrEff: number;
  invTemp: number;
  envTemp: number;
  dailyEnergy: number;
  weeklyEnergy: number;
  last7DaysEnergy: number;
  monthlyEnergy: number;
  yearlyEnergy: number;
  totalEnergy: number;
  partialEnergy: number;
  bulkV: number;
  bulkMV: number;
  bulkDC: number;
  isoRes: number;
  gridVDC: number;
  gridAvgV: number;
  gridDCHz: number;
  peakMax: number;
  peakDay: number;
  pin1W: number;
  pin2W: number;

  firmware: string;
  dateprod: string;
  serial: string;
  pn: string;
  address: number;
  model: string;
  apiVersion: string;
};

export type IAddress = {
  uuid: string;
  dev?: string;
  address: number;
  hub?: string;
  firmware?: string;
  dateprod?: string;
  pn?: string;
  serial?: string;
  model?: string;
  apiVersion?: string;
};
