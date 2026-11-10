import test from 'node:test'
import assert from 'node:assert/strict'
import { apiErrorDetails, applyFormErrors } from '../src/services/apiErrors.js'

test('preserves field errors and summarizes them for legacy toast consumers', () => {
 const e = { response: { status: 400, data: { errors: { email: 'Enter a valid email address', firstName: 'Enter the first name' } } } }
 assert.deepEqual(apiErrorDetails(e), { message: 'Enter a valid email address Enter the first name', errors: e.response.data.errors })
})
test('maps each server error to the form and focuses only the first field', () => {
 const calls=[]
 applyFormErrors({message:'Fix fields',errors:{email:'Invalid email',firstName:'First name required'}}, (...args)=>calls.push(args))
 assert.deepEqual(calls, [['email',{type:'server',message:'Invalid email'},{shouldFocus:true}],['firstName',{type:'server',message:'First name required'},{shouldFocus:false}]])
})
test('object-level validation is displayed without assigning a fake form field', () => {
 const calls=[]; const message=applyFormErrors({errors:{_global:'End date must follow start date'}}, (...args)=>calls.push(args))
 assert.equal(message,'End date must follow start date');assert.equal(calls.length,0)
})
test('keeps useful authentication and conflict messages',()=>{
 for(const [status,message] of [[401,'Invalid username or password'],[409,'Email already exists']]) assert.equal(apiErrorDetails({response:{status,data:{message}}}).message,message)
})
test('does not expose internal server details',()=>{
 const r=apiErrorDetails({response:{status:500,data:{message:'SQL select private_users secret',errors:{sql:'secret'}}}})
 assert(!r.message.includes('SQL'));assert(!r.message.includes('secret'));assert.deepEqual(r.errors,{})
})
test('network failure explains connectivity',()=>assert.match(apiErrorDetails({isAxiosError:true,code:'ERR_NETWORK',message:'Network Error'}).message,/connect to the server/))
test('timeouts warn about ambiguous write completion',()=>assert.match(apiErrorDetails({isAxiosError:true,code:'ECONNABORTED'}).message,/Check whether your changes were saved/))
test('empty/malformed bodies use status-specific fallbacks, not Axios technical text',()=>{
 assert.match(apiErrorDetails({isAxiosError:true,message:'Request failed with status code 403',response:{status:403,data:'<html>Bad gateway</html>'}}).message,/permission/)
})
test('Redux string rejections remain readable',()=>assert.equal(apiErrorDetails('Existing employee cannot be deleted').message,'Existing employee cannot be deleted'))
test('file and rate limits give useful actions',()=>{
 assert.match(apiErrorDetails({response:{status:413,data:null}}).message,/smaller file/)
 assert.match(apiErrorDetails({response:{status:429,data:{}}}).message,/wait/)
})
test('malformed field error values cannot reach React as objects',()=>assert.deepEqual(apiErrorDetails({errors:{email:{sql:'secret'},name:null}}).errors,{}))
