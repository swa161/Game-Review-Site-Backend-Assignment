import * as genToken from "rand-token";

const generateToken = async (): Promise<any> => {
    return genToken.generate(16);
}

export {generateToken}