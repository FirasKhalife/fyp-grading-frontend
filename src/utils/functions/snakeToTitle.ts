const snakeToTitle = (s: string) => ( 
    s.replace (/^[-_]*(.)/, (_, c) => c.toUpperCase())
      .replace (/[-_]+(.)/g, (_, c) => ' ' + c.toUpperCase())
);
export default snakeToTitle;