import { tableFromIPC } from "apache-arrow";

async function main() {
  const res = await fetch("http://127.0.0.1:3000/arrow");
  const buf = await res.arrayBuffer();

  const table = tableFromIPC(new Uint8Array(buf));
  console.log("Arrow rows:", table.numRows);
  console.log(table.toString());
}

main().catch(console.error);
