(() => {
  const statusElement = document.createElement('code');
  statusElement.classList.add('item-ws-status');
  statusElement.style.fontWeight = 'bold';
  statusElement.innerText = 'Connecting...';
  document.addEventListener('mainShown', () => {
    document.querySelector('#bar')?.append(statusElement);
  });
  let scrollY = 0;
  document.addEventListener('htmlChanged', () => {
    vno.element.scroll(scrollY, false);
  });
  document.addEventListener('rendered', () => {
    scrollY = 0;
    vno.file.enableCache();
  });
  const extraFiles = ['/common.md'];
  const maxCount = 10;
  let count = 0;
  const connect = () => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      statusElement.style.backgroundColor = 'rgba(var(--danger-color),.1)';
      if (++count <= maxCount) {
        statusElement.innerText = `Reconnecting...(${count}/${maxCount})`;
        setTimeout(() => connect(), 1000);
        return;
      }
      statusElement.innerText = 'Disconnected!';
    };
    ws.onopen = () => {
      statusElement.style.backgroundColor = 'rgba(var(--success-color),.1)';
      statusElement.innerText = 'Connected';
      count = 0;
    };
    ws.onmessage = ({ data }) => {
      const response = JSON.parse(data);
      switch (response.type) {
        case 0:
          location.reload();
          break;
        case 1:
          const path = response.data;
          vno.file.disableCache();
          if ([vno.filePath, ...vno.mainSelf.links, ...extraFiles].map(decodeURI).includes(path)) {
            scrollY = window.scrollY;
            vno.reload();
          } else {
            vno.file.getFile(path).then(() => vno.file.enableCache());
          }
          break;
      }
    };
  };
  connect();
})();
