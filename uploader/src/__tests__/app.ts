import * as app from '../app';
var event:any, context:any;

describe('Tests index', () => {
    test('verifies successful response', async () => {
        const result = await app.lambdaHandler(event, context)

        expect(result).toEqual(expect.any(Object));
        expect(result.statusCode).toBe(200);
        expect(result.body).toEqual(expect.any(String));

        let response = JSON.parse(result.body);

        expect(response).toEqual(expect.any(Object));
        expect(response.message).toMatch("hello world");
        // expect(response.location).to.be.an("string");
    });
});
