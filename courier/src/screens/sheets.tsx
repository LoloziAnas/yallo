import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { Btn } from '@/components/button';
import { useBottomPad, useDirection } from '@/components/screen';
import { ListCard, ListRow, SheetHeader } from '@/components/ui';
import type { IconName } from '@/components/icon';
import { fmt } from '@/data/demo';
import { isPickupPhase, useCourier, useT, type EdgeKind, useOrder } from '@/store/courier-store';
import { colors } from '@/theme';

/** Bottom-sheet body. Holds dispatch while open so a request never lands behind the sheet. */
function Sheet({ children }: { children: React.ReactNode }) {
  const set = useCourier((s) => s.set);
  const direction = useDirection();
  const bottom = useBottomPad(8);
  useFocusEffect(
    useCallback(() => {
      set({ sheetOpen: true });
      return () => set({ sheetOpen: false });
    }, [set]),
  );
  return (
    <View
      style={{ direction, paddingHorizontal: 20, paddingTop: 24, paddingBottom: bottom, gap: 12 }}>
      {children}
    </View>
  );
}

/** Problems the courier reports land in ops' Support queue (live), worded for ops. */
const REPORTS: Partial<Record<EdgeKind, [string, string]>> = {
  closed: [
    'Restaurant closed on arrival',
    'The restaurant is closed. Returning the order to the queue.',
  ],
  slow: ['Restaurant is taking long', 'Waiting at the restaurant, the order is not ready yet.'],
  unavail: [
    'Customer not answering',
    'At the drop-off, the customer is not answering. Started the wait timer.',
  ],
  address: [
    'Wrong address',
    'The customer is not at the drop-off address. Please confirm their location.',
  ],
  payment: ["Customer can't pay", "The customer can't pay cash on delivery."],
};

/** Close the sheet, then show an edge-case screen over the delivery. */
function toEdge(edge: EdgeKind) {
  router.back();
  const { set, reportProblem } = useCourier.getState();
  set({ edge, edgeT: 0 });
  const report = REPORTS[edge];
  if (report) reportProblem(...report);
}

interface Opt {
  icon: IconName;
  label: string;
  sub: string;
  danger?: boolean;
  onPress: () => void;
}

export function ProblemSheet() {
  const order = useOrder();
  const t = useT();
  const phase = useCourier((s) => s.phase);
  const atStore = isPickupPhase(phase);
  const cancel: Opt = {
    icon: 'x',
    label: 'Cancel this delivery',
    sub: 'May affect your completion rate',
    danger: true,
    onPress: () => router.replace('/cancel-delivery'),
  };
  const opts: Opt[] = atStore
    ? [
        {
          icon: 'store',
          label: 'Restaurant is closed',
          sub: "You'll be compensated for the trip",
          onPress: () => toEdge('closed'),
        },
        {
          icon: 'clock',
          label: 'Order is taking too long',
          sub: 'Start a wait timer',
          onPress: () => toEdge('slow'),
        },
        {
          icon: 'help',
          label: 'Something else',
          sub: 'Chat with support',
          onPress: () => router.replace('/support'),
        },
        cancel,
      ]
    : [
        {
          icon: 'user',
          label: "Customer isn't answering",
          sub: 'Start a 5-minute wait timer',
          onPress: () => toEdge('unavail'),
        },
        {
          icon: 'pin',
          label: 'Wrong address',
          sub: 'We will contact the customer',
          onPress: () => toEdge('address'),
        },
        {
          icon: 'wallet',
          label: "Customer can't pay",
          sub: 'Cash on delivery issue',
          onPress: () => toEdge('payment'),
        },
        cancel,
      ];
  return (
    <Sheet>
      <SheetHeader
        title={t("What's the problem?")}
        sub={t(`Order ${order.id} · ${atStore ? order.store : order.custFull}`)}
      />
      <ListCard>
        {opts.map((op, i) => (
          <ListRow
            key={op.label}
            icon={op.icon}
            label={t(op.label)}
            sub={t(op.sub)}
            color={op.danger ? colors.accent700 : colors.text}
            chevron={false}
            last={i === opts.length - 1}
            onPress={op.onPress}
          />
        ))}
      </ListCard>
      <Btn
        variant="secondary"
        label={t('Close')}
        height={54}
        fontSize={17}
        onPress={() => router.back()}
      />
    </Sheet>
  );
}

export function CancelSheet() {
  const t = useT();
  return (
    <Sheet>
      <SheetHeader
        title={t('Cancel this delivery?')}
        sub={t(
          "Cancelling lowers your completion rate (98%). If the problem is the restaurant or customer, report it instead — that won't count against you.",
        )}
      />
      <Btn label={t('Keep delivery')} height={60} fontSize={18} onPress={() => router.back()} />
      <Btn
        variant="secondary"
        label={t('Cancel delivery')}
        height={54}
        fontSize={17}
        onPress={() => toEdge('cancelled')}
      />
    </Sheet>
  );
}

export function WithdrawSheet() {
  const t = useT();
  const balance = useCourier((s) => s.balance);
  const withdraw = useCourier((s) => s.withdraw);
  return (
    <Sheet>
      <SheetHeader
        title={t(`Withdraw ${fmt(balance)} DH`)}
        sub={t('To CIH Bank •••• 4417 · usually arrives within 24 hours · no fee')}
      />
      <Btn
        label={t('Confirm withdrawal')}
        height={60}
        fontSize={18}
        onPress={() => {
          router.back();
          withdraw();
        }}
      />
      <Btn
        variant="secondary"
        label={t('Cancel')}
        height={54}
        fontSize={17}
        onPress={() => router.back()}
      />
    </Sheet>
  );
}
