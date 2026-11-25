import { HttpException, HttpStatus } from '@nestjs/common';

export class DispatchApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ statusCode: status, error: code, message }, status);
  }
}

export class OfferClosedException extends DispatchApiException {
  constructor(message = 'This offer is no longer open or has been accepted by another nurse.') {
    super('OFFER_CLOSED', message, HttpStatus.CONFLICT);
  }
}

export class NoLongerEligibleException extends DispatchApiException {
  constructor(message = 'Nurse is no longer eligible or availability has changed.') {
    super('NO_LONGER_ELIGIBLE', message, HttpStatus.CONFLICT);
  }
}

export class QuoteExpiredException extends DispatchApiException {
  constructor(message = 'The specified quote has expired.') {
    super('QUOTE_EXPIRED', message, HttpStatus.BAD_REQUEST);
  }
}

export class InvalidServiceException extends DispatchApiException {
  constructor(message = 'Requested service is unrecognized or unsupported.') {
    super('INVALID_SERVICE', message, HttpStatus.BAD_REQUEST);
  }
}

export class LocationRequiredException extends DispatchApiException {
  constructor(message = 'Nurse location consent and presence coordinates are required.') {
    super('LOCATION_REQUIRED', message, HttpStatus.BAD_REQUEST);
  }
}

export class BookingNotCancellableException extends DispatchApiException {
  constructor(message = 'Booking cannot be cancelled in its current state.') {
    super('BOOKING_NOT_CANCELLABLE', message, HttpStatus.CONFLICT);
  }
}

export class BookingNotFoundException extends DispatchApiException {
  constructor(id: string) {
    super('BOOKING_NOT_FOUND', `Booking ${id} was not found.`, HttpStatus.NOT_FOUND);
  }
}

export class OfferNotFoundException extends DispatchApiException {
  constructor(id: string) {
    super('OFFER_NOT_FOUND', `Offer ${id} was not found.`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidPinException extends DispatchApiException {
  constructor(message = 'The 4-digit Visit Verification PIN provided is invalid.') {
    super('INVALID_PIN', message, HttpStatus.BAD_REQUEST);
  }
}

export class NurseNotVerifiedException extends DispatchApiException {
  constructor(message = 'Nurse credentials are not yet approved by operations.') {
    super('NURSE_NOT_VERIFIED', message, HttpStatus.FORBIDDEN);
  }
}
