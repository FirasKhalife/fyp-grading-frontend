
export default class StringUtils {
  
  static stringToDate = (str: string) : Date => {
    if (!str) return new Date();

    return new Date(str.replace('T', ' '));
  }

  static snakeToTitle = (s: string) => ( 
    s.replace(/_/g, ' ')
      .replace(/(\w)(\w*)/g,
        function(_,g1,g2){return g1.toUpperCase() + g2.toLowerCase();})
  );

  static snakeToTitleList = (stringList: string[]) => {
    return stringList.map((s: string) => StringUtils.snakeToTitle(s));
  }

}
