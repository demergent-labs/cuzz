use candid_parser::{bindings::javascript::compile, check_prog, IDLProg, TypeEnv};
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};

#[wasm_bindgen]
pub fn parse_candid(candid: String) -> Result<JsValue, JsValue> {
    let ast: IDLProg = candid.parse().unwrap();

    serde_wasm_bindgen::to_value(&ast).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn compile_candid(candid: String) -> Result<JsValue, JsValue> {
    let ast: IDLProg = candid.parse().unwrap();

    let mut env = TypeEnv::new();
    let actor = check_prog(&mut env, &ast).unwrap();
    let js = compile(&env, &actor);

    Ok(JsValue::from_str(&js))
}
