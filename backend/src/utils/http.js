export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const check = (condition, status, message) => {
  if (!condition) throw new HttpError(status, message);
};
export const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  managerId: user.managerId,
  createdAt: user.createdAt,
});
export function serializeExpense(doc) {
  const e = doc.toObject ? doc.toObject() : { ...doc };
  if (e.receipt) {
    const { data, ...metadata } = e.receipt;
    e.receipt = metadata;
  }
  e.amount = e.amount / 100;
  delete e.__v;
  return e;
}
export const populateExpense = (query) =>
  query
    .populate("employeeId", "name email")
    .populate("managerId", "name email")
    .populate("reviewedBy", "name")
    .populate("paidBy", "name");
export const audit = (req, action, note = "") => ({
  action,
  actorId: req.user._id,
  actorName: req.user.name,
  note,
  at: new Date(),
});
