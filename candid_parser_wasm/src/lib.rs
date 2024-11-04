use candid_parser::IDLProg;
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};

#[wasm_bindgen]
pub fn parse_candid(candid: String) -> Result<JsValue, JsValue> {
    let ast: IDLProg = candid.parse().unwrap();

    serde_wasm_bindgen::to_value(&ast).map_err(|e| JsValue::from_str(&e.to_string()))
}
