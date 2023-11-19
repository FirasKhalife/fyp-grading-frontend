const snakeToTitle = (s: string) => ( 
    s.replace (/^[-_]*(.)/, (_, c) => c.toUpperCase())
      .replace (/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase())
);

const snakeToTitleList = (stringList: string[]) => {
  return stringList.map(snakeToTitle).join(', ').replace(/, ([^,]*)$/, ' and $1');
}

export {snakeToTitle, snakeToTitleList};