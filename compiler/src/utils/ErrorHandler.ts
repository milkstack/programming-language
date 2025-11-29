export class ErrorHandler {
  private static throwOnError: boolean = false

  static setThrowOnError(throwOnError: boolean): void {
    ErrorHandler.throwOnError = throwOnError
  }

  static exitOrThrow(exitCode: number): never {
    if (ErrorHandler.throwOnError) {
      throw new Error(exitCode.toString())
    }

    process.exit(exitCode)
  }
}
