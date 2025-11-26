export function maskPhone(phone: string): string {
  return phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
}
export function maskLastName(name: string): string {
  if (!name?.length) return '';
  if (name.length <= 1) return name;
  return '*'.repeat(name.length - 1) + name.slice(-1);
}
export function maskIdNumber(id: string): string {
  if (!id?.length) return '';
  if (id.length <= 2) return id;
  return id[0] + '*'.repeat(id.length - 2) + id.slice(-1);
}