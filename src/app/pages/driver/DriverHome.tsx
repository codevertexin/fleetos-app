import { useState } from 'react';
import { mockAssignments } from '@/lib/mock-data';
import { CheckInFlow } from '../../../features/driver-home/CheckInFlow';
import { CheckOutFlow } from '../../../features/driver-home/CheckOutFlow';
import { ShiftDashboard } from '../../../features/driver-home/ShiftDashboard';

type ShiftState = 'idle' | 'active' | 'done';
type Screen =
  | 'home'
  | 'checkin_odometer' | 'checkin_fuel' | 'checkin_photos' | 'checkin_confirm'
  | 'checkout_odometer' | 'checkout_fuel' | 'checkout_damage';

const CHECKIN_SCREENS: Screen[] = ['checkin_odometer', 'checkin_fuel', 'checkin_photos', 'checkin_confirm'];
const CHECKOUT_SCREENS: Screen[] = ['checkout_odometer', 'checkout_fuel', 'checkout_damage'];

export default function DriverHome() {
  const [screen, setScreen] = useState<Screen>('home');
  const [shiftState, setShiftState] = useState<ShiftState>('idle');
  const [checkinData, setCheckinData] = useState({ odometer: '', fuel: '' });
  const [checkoutData, setCheckoutData] = useState({ odometer: '', fuel: '', damage: '', hasDamage: false });

  const todayAssignment = mockAssignments[0];

  if (CHECKIN_SCREENS.includes(screen)) {
    return (
      <CheckInFlow
        screen={screen}
        checkinData={checkinData}
        setCheckinData={setCheckinData}
        vehiclePlate={todayAssignment.vehiclePlate}
        onBack={(s) => setScreen(s as Screen)}
        onNext={(s) => setScreen(s as Screen)}
        onConfirm={() => { setShiftState('active'); setScreen('home'); }}
      />
    );
  }

  if (CHECKOUT_SCREENS.includes(screen)) {
    return (
      <CheckOutFlow
        screen={screen}
        checkoutData={checkoutData}
        setCheckoutData={setCheckoutData}
        checkinOdometer={checkinData.odometer}
        onBack={(s) => setScreen(s as Screen)}
        onNext={(s) => setScreen(s as Screen)}
        onConfirm={() => { setShiftState('done'); setScreen('home'); }}
      />
    );
  }

  return (
    <ShiftDashboard
      shiftState={shiftState}
      onStartShift={() => setScreen('checkin_odometer')}
      onEndShift={() => setScreen('checkout_odometer')}
    />
  );
}
