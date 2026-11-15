/**
 * The screens read and write through `repository`, built on the OpenAPI contract
 * (contract/openapi.yaml → schema.d.ts). In the offline demo and in tests, MSW serves the same
 * endpoints from the visitor's demo copy (src/mocks); against the gateway, the Spring services do.
 */
export { ApiError } from './client'
export { httpRepository as repository, type DraftState, type Viewer } from './http-repository'
