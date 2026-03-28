fn main() {
    match server_core::certs::ensure_certs() {
        Ok((cert, key)) => {
            println!("cert: {}", cert.display());
            println!("key:  {}", key.display());
        }
        Err(e) => {
            eprintln!("Certificate generation failed: {e}");
            std::process::exit(1);
        }
    }
}
