export const H1 = ({ className, children }) => {
  return (
    <h1
      className={`scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${className}`}
    >
      {children}
    </h1>
  );
};

export const H2 = ({ className, children }) => {
  return (
    <h2
      className={`scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 ${className}`}
    >
      {children}
    </h2>
  );
};

export const H3 = ({ className, children }) => {
  return (
    <h3
      className={`scroll-m-20 text-2xl font-semibold tracking-tight ${className}`}
    >
      {children}
    </h3>
  );
};

export const H4 = ({ className, children }) => {
  return (
    <h4
      className={`scroll-m-20 text-xl font-semibold tracking-tight ${className}`}
    >
      {children}
    </h4>
  );
};

export const P = ({ className, children }) => {
  return (
    <p className={`leading-7 [&:not(:first-child)]:mt-6 ${className}`}>
      {children}
    </p>
  );
};

export const Blockquote = ({ className, children }) => {
  return (
    <blockquote className={`mt-6 border-l-2 pl-6 italic ${className}`}>
      {children}
    </blockquote>
  );
};

export const InlineCode = ({ className, children }) => {
  return (
    <code
      className={`relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold ${className}`}
    >
      {children}
    </code>
  );
};

export const Lead = ({ className, children }) => {
  return (
    <p className={`text-xl text-muted-foreground ${className}`}>{children}</p>
  );
};

export const Large = ({ className, children }) => {
  return <div className={`text-lg font-semibold ${className}`}>{children}</div>;
};

export const Muted = ({ className, children }) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>{children}.</p>
  );
};
