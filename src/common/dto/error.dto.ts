import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({
    default: 'Internal Server Error',
    readOnly: true,
    oneOf: [
      { type: 'string', readOnly: true },
      { type: 'array', items: { type: 'string' }, readOnly: true },
    ],
  })
  readonly message: string | string[];

  @ApiProperty({
    enum: HttpStatus,
    enumName: 'HttpStatus',
    default: HttpStatus.INTERNAL_SERVER_ERROR,
    readOnly: true,
  })
  readonly statusCode: HttpStatus;

  @ApiProperty({ required: false, readOnly: true })
  readonly error?: string;
}
