import * as passwordHash from 'bcrypt';



const hash = async (password: string): Promise<string> => {
    const salt = await passwordHash.genSalt(10);
    const hashedPass = passwordHash.hashSync(password, salt);
    return hashedPass;
}

const compare = async (password: string, comp: string): Promise<boolean> => {
    return  passwordHash.compare(password, comp);
}

export {hash, compare}