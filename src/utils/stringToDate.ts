
const stringToDate = (str: string) : Date => {
  if (!str) return new Date();

  return new Date(str.replace('T', ' '));
}
export default stringToDate;