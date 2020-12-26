declare namespace vno {
  module element {
    function scroll(height: number, isSmooth: boolean): void
  }

  module file {
    function disableCache(): void

    function enableCache(): void

    function getFile(path: string): Promise<any>
  }

  namespace mainSelf {
    const links: string[];
  }

  const filePath: string;

  function reload(): void
}
