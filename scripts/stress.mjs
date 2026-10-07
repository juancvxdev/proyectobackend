import autocannon from 'autocannon'

const url = process.env.STRESS_URL ?? 'http://localhost:4000/v1/health'

const result = await autocannon({
  url,
  connections: Number(process.env.STRESS_CONNECTIONS ?? 25),
  duration: Number(process.env.STRESS_DURATION ?? 20),
})

console.log(autocannon.printResult(result))
