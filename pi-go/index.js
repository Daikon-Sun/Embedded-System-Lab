const {Controller, Command, Response} = require('@sabaki/gtp')

leelaz_path = '/home/daikon/Documents/ESL2018/pi-go/leelaz/leelaz'
leelaz_weight_path = '/home/daikon/Documents/ESL2018/pi-go/leelaz/best-network'
leelaz_args = ['--gtp', '-w', leelaz_weight_path]

async function leelaz_main() {
  let leelaz = new Controller(leelaz_path, leelaz_args)
  leelaz.start()
  let {id, content, error} = await leelaz.sendCommand({name: 'genmove', args: ['B']})
  if (error) throw new Error('leelaz throwed an error!')
  console.log(content)
  await leelaz.stop()
}

leelaz_main()

phoenixgo_path = '/home/daikon/Documents/ESL2018/pi-go/PhoenixGo/mcts/mcts_main'
phoenixgo_config_path = '/home/daikon/Documents/ESL2018/pi-go/PhoenixGo/pi-go.conf'
phoenixgo_args = ['--config_path=' + phoenixgo_config_path, '--gtp']

async function phoenixgo_main() {
  let phoenixgo = new Controller(phoenixgo_path, phoenixgo_args)
  phoenixgo.start()
  let {id, content, error} = await phoenixgo.sendCommand({name: 'genmove', args: ['B']})
  if (error) throw new Error('phoenixgo throwed an error!')
  console.log(content)
  await phoenixgo.stop()
}

phoenixgo_main()
