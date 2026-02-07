import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [     mkcert({
      savePath: "./certs",
      certFileName: "localhost.pem",
      keyFileName: "localhost-key.pem",
      hosts: ["localhost", "127.0.0.1", "::1"],
    }),mkcert() 
  ]
})

