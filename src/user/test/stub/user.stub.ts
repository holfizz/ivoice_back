// src/users/test/stubs/user.stub.ts

import * as bcrypt from "bcrypt";

const hashedPassword = bcrypt.hashSync("yourStrong(!)Password", 5);

export const testUser = {
  email: "testuser@example.com",
  password: hashedPassword,
  firstName: "Test",
  phoneNumber: "+12345678900",
};
