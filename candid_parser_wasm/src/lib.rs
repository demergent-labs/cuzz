use candid_parser::{
    bindings::javascript::compile, check_prog, pretty_check_file, IDLProg, TypeEnv,
};
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};
use web_sys::console;

#[wasm_bindgen]
pub fn parse_candid(candid: String) -> Result<JsValue, JsValue> {
    let ast: IDLProg = candid.parse().unwrap();

    console::log_1(&format!("ast: {:#?}", ast).into());

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
