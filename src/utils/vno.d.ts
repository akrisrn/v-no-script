declare namespace vno {
  module element {
    function scroll(height: number, isSmooth: boolean): void
  }

  module file {
    function disableCache(): void

    function enableCache(): void
  }

  namespace mainSelf {
    const links: string[];
  }

  const filePath: string;

  function reload(): void
}
