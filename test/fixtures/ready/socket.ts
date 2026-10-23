/* A WebSocket client with the machine's own WebSocket, which the test preload's DOM replaces. */
const [url, origin] = [process.argv[2]!, process.argv[3]!]
const socket = new WebSocket(url, { headers: { origin } } as unknown as string[])
const got: string[] = []
socket.onopen = () => {
  socket.send('a')
  socket.send('b')
}
socket.onmessage = (event) => {
  got.push(String(event.data))
  if (got.length === 2) {
    console.log(got.join(','))
    socket.close()
    process.exit(0)
  }
}
socket.onerror = () => {
  console.log('ERROR')
  process.exit(1)
}
setTimeout(() => {
  console.log('TIMEOUT')
  process.exit(1)
}, 5000)
