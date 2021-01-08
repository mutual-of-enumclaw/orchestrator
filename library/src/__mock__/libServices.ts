import { SNSUtils } from '../utils';

export class MockSNSUtils {
    public subscriberCount: number;
    public publishWithMetadataInput;
    public publishWithMetadataRetval;
    public publishWithMetadataCallCount;
    public getSubscriberCount = jest.fn();
    public publishWithMetadata = jest.fn();

    constructor (snsClass = null) {
        if (!snsClass) {
            snsClass = SNSUtils;
        }
        snsClass.prototype.getSubscriberCount = this.getSubscriberCount;
        snsClass.prototype.publishWithMetadata = this.publishWithMetadata;
    }

    reset () {
        this.subscriberCount = 1;
        this.publishWithMetadataInput = [];
        this.publishWithMetadataRetval = null;

        this.getSubscriberCount.mockReset();
        this.getSubscriberCount.mockImplementation(() => {
            return this.subscriberCount;
        });

        this.publishWithMetadata.mockReset();
        this.publishWithMetadata.mockImplementation((message, metadata) => {
            this.publishWithMetadataInput.push({
                message,
                metadata
            });
            return this.publishWithMetadataRetval;
        });
    }
}

export class MockMakeLambdaCallWrapper {
  static calls = [];
  static retval = {};
  static error = '';
  public calls = MockMakeLambdaCallWrapper.calls;
  public MakeLambdaCallRetval: any = MockMakeLambdaCallWrapper.retval;

  public reset () {
      MockMakeLambdaCallWrapper.calls = [];
      this.calls = MockMakeLambdaCallWrapper.calls;
      MockMakeLambdaCallWrapper.error = null;
      MockMakeLambdaCallWrapper.retval = { StatusCode: 200 };
      this.MakeLambdaCallRetval = MockMakeLambdaCallWrapper.retval;
  }

  public setError (error) {
      MockMakeLambdaCallWrapper.error = error;
  }

  public async MakeLambdaCall<T> (event: string, functionName: string, config: any) {
      MockMakeLambdaCallWrapper.calls.push({ event, functionName });
      if (MockMakeLambdaCallWrapper.error) {
          throw MockMakeLambdaCallWrapper.error;
      }

      return MockMakeLambdaCallWrapper.retval;
  }
}
