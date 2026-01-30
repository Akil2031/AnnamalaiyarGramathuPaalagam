// STEP 1: Monthly delivery total
export const getDeliveryTotal = (
  deliveries,
  customerId,
  month
) => {
  return deliveries
    .filter(
      (d) =>
        d.customerId === customerId &&
        d.date.startsWith(month)
    )
    .reduce(
      (sum, d) => sum + d.quantity * d.price,
      0
    );
};

// STEP 2: Monthly paid total
export const getPaidTotal = (
  payments,
  customerId,
  month
) => {
  return payments
    .filter(
      (p) =>
        p.customerId === customerId &&
        p.month === month
    )
    .reduce(
      (sum, p) => sum + p.amountPaid,
      0
    );
};

// STEP 3: Final pending calculation
export const getPendingAmount = (
  deliveries,
  payments,
  customerId,
  month
) => {
  const deliveryTotal = getDeliveryTotal(
    deliveries,
    customerId,
    month
  );
  const paidTotal = getPaidTotal(
    payments,
    customerId,
    month
  );

  return deliveryTotal - paidTotal;
};
