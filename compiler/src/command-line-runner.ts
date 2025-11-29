import { main } from './main'

const args = process.argv.slice(2)

if (args.length < 2) {
  console.error('Usage: node main.js <filePath> <outputDir>')
  process.exit(1)
}

const [filePath, outputDir] = args
main(filePath, outputDir)
