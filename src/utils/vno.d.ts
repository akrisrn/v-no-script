declare namespace vno {
  module enums {
    enum EEvent {
      rendered = 'rendered'
    }
  }

  module file {
    function disableCache(): void

    function enableCache(): void
  }

  namespace homeSelf {
    const links: string[];
  }

  const filePath: string;

  function reload(): void
}
