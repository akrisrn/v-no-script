(async () => {
  await (async () => {
    while (true) {
      try {
        // noinspection BadExpressionStatementJS
        vno;
        break;
      } catch {
        await new Promise(_ => setTimeout(_, 100));
      }
    }
  })();
  const listeningFiles = ['/common.md'];
  const statusElement = document.createElement('code');
  statusElement.style.fontWeight = 'bold';
  statusElement.innerText = 'Connecting...';
  document.addEventListener(vno.enums.EEvent.rendered, () => {
    document.querySelector('#bar')!.append(statusElement);
    vno.file.enableCache();
  });
  const maxCount = 5;
  let count = 0;
  const connect = () => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      statusElement.style.backgroundColor = 'rgba(var(--danger-color),.1)';
      count++;
      if (count <= maxCount) {
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
          if ([vno.filePath, ...vno.homeSelf.links, ...listeningFiles].includes(path)) {
            vno.file.disableCache();
            vno.reload();
          }
          break;
      }
    };
  };
  connect();
})();
