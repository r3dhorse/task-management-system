export const ID = {
  unique: () => 'mock-unique-id'
}

export const Client = jest.fn(() => ({
  setEndpoint: jest.fn(),
  setProject: jest.fn(),
  setKey: jest.fn(),
}))

export const Account = jest.fn()
export const Databases = jest.fn()
export const Storage = jest.fn()
export const Users = jest.fn()

export default {
  ID,
  Client,
  Account,
  Databases,
  Storage,
  Users,
}