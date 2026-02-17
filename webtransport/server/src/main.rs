mod certs;
mod encode;
mod query;
mod session;

use std::sync::Arc;

use anyhow::Result;
use wtransport::{Endpoint, ServerConfig};

#[tokio::main]
async fn main() -> Result<()> {
    let identity = certs::get_or_create_identity().await?;

    let ctx = Arc::new(query::create_context().await?);

    let config = ServerConfig::builder()
        .with_bind_default(4433)
        .with_identity(identity)
        .build();

    let server = Endpoint::server(config)?;
    println!("WebTransport server listening on https://127.0.0.1:4433");

    loop {
        let incoming_session = server.accept().await;
        let ctx = ctx.clone();

        tokio::spawn(async move {
            if let Err(e) = session::handle_session(incoming_session, ctx).await {
                eprintln!("Session error: {}", e);
            }
        });
    }
}
